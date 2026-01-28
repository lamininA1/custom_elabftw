<?php

/**
 * @author Nicolas CARPi <nico-git@deltablot.email>
 * @copyright 2012 Nicolas CARPi
 * @see https://www.elabftw.net Official website
 * @license AGPL-3.0
 * @package elabftw
 */

declare(strict_types=1);

namespace Elabftw\Services;

use Elabftw\Elabftw\FsTools;
use Elabftw\Interfaces\MpdfProviderInterface;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Mpdf\Mpdf;
use Override;

use function dirname;

/**
 * Get an instance of mpdf
 */
final class MpdfProvider implements MpdfProviderInterface
{
    public function __construct(private string $author, private string $format = 'A4', private bool $pdfa = false) {}

    #[Override]
    public function isPdfa(): bool
    {
        return $this->pdfa;
    }

    #[Override]
    public function getInstance(): Mpdf
    {
        $defaultConfig = (new ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];

        // Get default font data and add Pretendard GOV fonts
        $defaultFontConfig = (new FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $fontsPath = dirname(__DIR__, 2) . '/web/assets/fonts';
        // Convert to absolute path for mPDF
        $fontsPath = realpath($fontsPath) ?: $fontsPath;
        
        // Verify font files exist before registering
        $regularFont = $fontsPath . '/PretendardGOV-Regular.ttf';
        $boldFont = $fontsPath . '/PretendardGOV-Bold.ttf';
        $usePretendardGov = false;
        
        // Only register Pretendard GOV if font files exist
        if (file_exists($regularFont) && file_exists($boldFont) && is_readable($regularFont) && is_readable($boldFont)) {
            // Add Pretendard GOV font configuration
            // Font names in mPDF must be lowercase
            // Standard variants: R=Regular, B=Bold, I=Italic, BI=Bold Italic
            // Note: mPDF only supports R, B, I, BI keys. Other weights are handled via CSS font-weight
            // File names must match exactly (case-sensitive on some systems)
            $fontData['pretendardgov'] = array(
                'R' => 'PretendardGOV-Regular.ttf',      // Regular (400) - default
                'B' => 'PretendardGOV-Bold.ttf',         // Bold (700)
                'I' => 'PretendardGOV-Regular.ttf',      // Italic (using Regular as base)
                'BI' => 'PretendardGOV-Bold.ttf',        // Bold Italic
            );
            $usePretendardGov = true;
        }
        
        // create the pdf
        $mpdf = new Mpdf(array(
            'format' => $this->format,
            'tempDir' => FsTools::getCacheFolder('mpdf'),
            'mode' => 'utf-8',
            'fontDir' => array_merge($fontDirs, array($fontsPath)),
            'fontdata' => $fontData,
            'default_font' => $usePretendardGov ? 'pretendardgov' : 'DejaVu',
            // disallow getting external things
            'whitelistStreamWrappers' => array(''),
        ));

        // make sure we can read the pdf in a long time
        // will embed the font and make the pdf bigger
        $mpdf->PDFA = $this->pdfa;
        // force pdfa compliance (things like removing alpha channel of png images)
        if ($this->pdfa) {
            $mpdf->PDFAauto = true;
        }

        // make sure header and footer are not overlapping the body text
        $mpdf->setAutoTopMargin = 'stretch';
        $mpdf->setAutoBottomMargin = 'stretch';

        // set metadata
        $mpdf->SetAuthor($this->author);

        $mpdf->SetTitle('eLabFTW pdf');
        $mpdf->SetSubject('eLabFTW pdf');
        $mpdf->SetCreator('www.elabftw.net');

        return $mpdf;
    }
}
